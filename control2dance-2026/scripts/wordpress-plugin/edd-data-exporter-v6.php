<?php
/**
 * Plugin Name: EDD Data Exporter (v6 - DEEP SCAN)
 * Description: Buscador profundo de IDs de Stripe/PayPal en todas las tablas
 * Version: 6.0.0
 */

if (!defined('ABSPATH')) exit;

class EDD_Data_Exporter_V6 {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_export_edd_data_v6', [$this, 'handle_export']);
    }
    
    public function add_admin_menu() {
        add_menu_page('EDD Export v6', 'EDD Export v6', 'manage_options', 'edd-data-exporter-v6', [$this, 'admin_page'], 'dashicons-search', 100);
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>🔍 Escaneo Profundo de Transacciones (v6)</h1>
            <p>Este plugin va a rastrear los últimos pedidos buscando cualquier rastro de IDs que empiecen por <code>pi_</code>, <code>cs_</code> o <code>ch_</code> en todas las tablas posibles.</p>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="export_edd_data_v6">
                <?php wp_nonce_field('export_edd_data_v6', 'export_nonce'); ?>
                <?php submit_button('🚀 Iniciar Escaneo Profundo'); ?>
            </form>
        </div>
        <?php
    }
    
    public function handle_export() {
        if (!current_user_can('manage_options')) wp_die('Permisos insuficientes');
        check_admin_referer('export_edd_data_v6', 'export_nonce');
        
        $diag = [
            'exported_at' => current_time('mysql'),
            'orders' => $this->deep_scan_orders(20),
        ];
        
        $json = json_encode($diag, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="edd-deep-scan-v6-' . date('Y-m-d-His') . '.json"');
        echo $json; exit;
    }
    
    private function deep_scan_orders($limit = 20) {
        global $wpdb;
        $data = [];
        
        $orders = $wpdb->get_results("SELECT id, order_number, gateway FROM {$wpdb->prefix}edd_orders ORDER BY id DESC LIMIT $limit");
        
        foreach ($orders as $order) {
            $scan = [
                'order_number' => $order->order_number,
                'gateway' => $order->gateway,
                'found_ids' => []
            ];

            // 1. Buscar en edd_ordermeta
            $meta = $wpdb->get_results($wpdb->prepare("SELECT meta_key, meta_value FROM {$wpdb->prefix}edd_ordermeta WHERE edd_order_id = %d", $order->id));
            foreach ($meta as $m) {
                if ($this->is_transaction_id($m->meta_value)) {
                    $scan['found_ids']['ordermeta_' . $m->meta_key] = $m->meta_value;
                }
            }

            // 2. Buscar en edd_order_transactions
            $txs = $wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}edd_order_transactions WHERE order_id = %d", $order->id));
            if ($txs) $scan['found_ids']['order_transactions_table'] = $txs;

            // 3. Buscar en postmeta (usando _edd_payment_id)
            $post_id = $wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->prefix}edd_ordermeta WHERE edd_order_id = %d AND meta_key = '_edd_payment_id'", $order->id));
            if ($post_id) {
                $pmeta = $wpdb->get_results($wpdb->prepare("SELECT meta_key, meta_value FROM {$wpdb->prefix}postmeta WHERE post_id = %d", $post_id));
                foreach ($pmeta as $m) {
                    if ($this->is_transaction_id($m->meta_value)) {
                        $scan['found_ids']['postmeta_' . $m->meta_key] = $m->meta_value;
                    }
                }
            }

            // 4. Si es PayPal Commerce, buscar específicamente paypal_order_id
            $pp_id = $wpdb->get_var($wpdb->prepare("SELECT meta_value FROM {$wpdb->prefix}edd_ordermeta WHERE edd_order_id = %d AND meta_key = 'paypal_order_id'", $order->id));
            if ($pp_id) $scan['found_ids']['paypal_direct'] = $pp_id;

            $data[] = $scan;
        }
        return $data;
    }

    private function is_transaction_id($val) {
        if (!is_string($val)) return false;
        $val = trim($val);
        // Stripe patterns
        if (strpos($val, 'pi_') === 0) return true;
        if (strpos($val, 'ch_') === 0) return true;
        if (strpos($val, 'cs_') === 0) return true;
        // PayPal patterns
        if (preg_match('/^[A-Z0-9]{17}$/', $val)) return true; // Standard PP ID
        return false;
    }
}
new EDD_Data_Exporter_V6();
