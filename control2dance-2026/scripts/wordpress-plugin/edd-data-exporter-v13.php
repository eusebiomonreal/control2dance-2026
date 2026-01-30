<?php
/**
 * Plugin Name: EDD Data Exporter (v13 - POSTMETA HUNTER)
 * Description: Busca IDs de transacciones en la tabla wp_postmeta (para datos heredados)
 * Version: 13.0.0
 */

if (!defined('ABSPATH')) exit;

class EDD_Data_Exporter_V13 {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_export_edd_data_v13', [$this, 'handle_export']);
    }
    
    public function add_admin_menu() {
        add_menu_page('EDD Export v13', 'EDD Export v13', 'manage_options', 'edd-data-exporter-v13', [$this, 'admin_page'], 'dashicons-archive', 100);
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>📦 Cazador de Postmeta (v13)</h1>
            <p>Este plugin va a rastrear la antigua tabla <code>wp_postmeta</code> buscando IDs de transacciones de Stripe y PayPal que no aparecen en las nuevas tablas de EDD.</p>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="export_edd_data_v13">
                <?php wp_nonce_field('export_edd_data_v13', 'export_nonce'); ?>
                <?php submit_button('🚀 Buscar en wp_postmeta'); ?>
            </form>
        </div>
        <?php
    }
    
    public function handle_export() {
        if (!current_user_can('manage_options')) wp_die('Permisos insuficientes');
        check_admin_referer('export_edd_data_v13', 'export_nonce');
        
        $export_data = [
            'exported_at' => current_time('mysql'),
            'orders' => $this->export_postmeta_orders(),
        ];
        
        $json = json_encode($export_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="edd-postmeta-v13-' . date('Y-m-d-His') . '.json"');
        echo $json; exit;
    }
    
    private function export_postmeta_orders() {
        global $wpdb;
        $data = [];
        
        // Obtenemos los pedidos de la tabla de EDD 3.x
        $orders = $wpdb->get_results("SELECT id, order_number, gateway FROM {$wpdb->prefix}edd_orders ORDER BY id DESC");
        
        foreach ($orders as $order) {
            $transaction_id = '';
            
            // 1. Intentamos encontrar el ID del post original
            $post_id = $wpdb->get_var($wpdb->prepare(
                "SELECT meta_value FROM {$wpdb->prefix}edd_ordermeta WHERE edd_order_id = %d AND meta_key = '_edd_payment_id'",
                $order->id
            ));

            if (!$post_id) {
                // Si no hay _edd_payment_id, tal vez el id de la orden es el post_id (en migraciones raras)
                // O el id es el mismo si no se movieron las tablas
                $post_id = $order->id;
            }

            if ($post_id) {
                // Buscamos llaves sospechosas en postmeta para este post
                $keys = [
                    '_edd_payment_transaction_id',
                    '_edd_stripe_payment_intent',
                    '_edd_stripe_charge_id',
                    '_edd_stripe_checkout_session',
                    '_paypal_transaction_id',
                    'edd_stripe_payment_intent',
                    'transaction_id'
                ];
                
                foreach ($keys as $key) {
                    $val = $wpdb->get_var($wpdb->prepare(
                        "SELECT meta_value FROM {$wpdb->prefix}postmeta WHERE post_id = %d AND meta_key = %s",
                        $post_id, $key
                    ));
                    if (!empty($val)) {
                        $transaction_id = $val;
                        break;
                    }
                }
            }
            
            // Solo incluimos si encontramos algo nuevo que no hayamos visto antes (opcional, pero mejor mandarlo todo para cruzar)
            if (!empty($transaction_id)) {
                $data[] = [
                    'order_number' => $order->order_number,
                    'payment_method' => $order->gateway,
                    'transaction_id' => $transaction_id,
                    'post_id' => $post_id
                ];
            }
        }
        return $data;
    }
}
new EDD_Data_Exporter_V13();
