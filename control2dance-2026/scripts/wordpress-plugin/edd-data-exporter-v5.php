<?php
/**
 * Plugin Name: EDD Data Exporter (v5 - TRANSACTION TABLE)
 * Description: Exporta IDs desde la tabla dedicada de transacciones de EDD
 * Version: 5.0.0
 */

if (!defined('ABSPATH')) exit;

class EDD_Data_Exporter_V5 {
    
    public function __construct() {
        add_action('admin_menu', [$this, 'add_admin_menu']);
        add_action('admin_post_export_edd_data_v5', [$this, 'handle_export']);
    }
    
    public function add_admin_menu() {
        add_menu_page('EDD Export v5', 'EDD Export v5', 'manage_options', 'edd-data-exporter-v5', [$this, 'admin_page'], 'dashicons-admin-links', 100);
    }
    
    public function admin_page() {
        ?>
        <div class="wrap">
            <h1>🔗 Exportador de Transacciones (v5)</h1>
            <p>Este exportador utiliza la tabla <code>wp_edd_order_transactions</code> identificada en el diagnóstico para obtener los IDs de Stripe y PayPal.</p>
            <form method="post" action="<?php echo admin_url('admin-post.php'); ?>">
                <input type="hidden" name="action" value="export_edd_data_v5">
                <?php wp_nonce_field('export_edd_data_v5', 'export_nonce'); ?>
                <?php submit_button('🚀 Generar Exportación v5'); ?>
            </form>
        </div>
        <?php
    }
    
    public function handle_export() {
        if (!current_user_can('manage_options')) wp_die('Permisos insuficientes');
        check_admin_referer('export_edd_data_v5', 'export_nonce');
        
        $export_data = [
            'exported_at' => current_time('mysql'),
            'orders' => $this->export_orders(),
        ];
        
        $json = json_encode($export_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename="edd-export-v5-' . date('Y-m-d-His') . '.json"');
        echo $json; exit;
    }
    
    private function export_orders() {
        global $wpdb;
        $data = [];
        
        $table_exists = $wpdb->get_var("SHOW TABLES LIKE '{$wpdb->prefix}edd_orders'");
        
        if ($table_exists) {
            $orders = $wpdb->get_results("SELECT o.*, c.email as c_email FROM {$wpdb->prefix}edd_orders o LEFT JOIN {$wpdb->prefix}edd_customers c ON o.customer_id = c.id ORDER BY o.id DESC");
            foreach ($orders as $order) {
                // 1. Buscar en la tabla dedicada de transacciones (muy probable para Stripe Checkout)
                $transaction_id = $wpdb->get_var($wpdb->prepare(
                    "SELECT transaction_id FROM {$wpdb->prefix}edd_order_transactions WHERE order_id = %d LIMIT 1",
                    $order->id
                ));

                // 2. Si sigue vacío, buscar llaves específicas en ordermeta (como paypal_order_id)
                if (empty($transaction_id)) {
                    $keys = ['paypal_order_id', '_edd_payment_transaction_id', '_edd_stripe_payment_intent', '_edd_stripe_checkout_session'];
                    foreach ($keys as $key) {
                        $val = $wpdb->get_var($wpdb->prepare(
                            "SELECT meta_value FROM {$wpdb->prefix}edd_ordermeta WHERE edd_order_id = %d AND meta_key = %s",
                            $order->id, $key
                        ));
                        if (!empty($val)) {
                            $transaction_id = $val;
                            break;
                        }
                    }
                }
                
                $data[] = [
                    'order_number' => $order->order_number,
                    'customer_email' => $order->c_email,
                    'payment_method' => $order->gateway,
                    'transaction_id' => $transaction_id
                ];
            }
        } else {
            // Fallback para versiones antiguas
            $orders = get_posts(['post_type' => 'edd_payment', 'posts_per_page' => -1, 'post_status' => 'any']);
            foreach ($orders as $order) {
                $data[] = [
                    'order_number' => get_post_meta($order->ID, '_edd_payment_number', true),
                    'customer_email' => get_post_meta($order->ID, '_edd_payment_user_email', true),
                    'payment_method' => get_post_meta($order->ID, '_edd_payment_gateway', true),
                    'transaction_id' => get_post_meta($order->ID, '_edd_payment_transaction_id', true)
                ];
            }
        }
        return $data;
    }
}
new EDD_Data_Exporter_V5();
